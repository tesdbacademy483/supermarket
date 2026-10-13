```groovy
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        DEPLOY_HOST = '103.91.186.93'
        DEPLOY_PORT = '32007'
        DEPLOY_SCRIPT = '/usr/local/sbin/deploy-supermarket'
        KNOWN_HOSTS = 'C:\\ProgramData\\Jenkins\\.jenkins\\supermarket_known_hosts'
        DEPLOY_ENABLED = 'true'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Repository checkout completed.'
            }
        }

        stage('Validate Branch and Files') {
            steps {
                script {
                    if (env.BRANCH_NAME &&
                        env.BRANCH_NAME != 'main') {
                        error('Production deployment is allowed only from main.')
                    }

                    if (env.GIT_BRANCH &&
                        env.GIT_BRANCH != 'origin/main' &&
                        env.GIT_BRANCH != 'main') {
                        error('Unexpected branch. Production requires main.')
                    }
                }

                bat '''
                    @echo off
                    setlocal

                    echo Checking production project files...

                    if not exist "Jenkinsfile" exit /b 1
                    if not exist "compose.production.yml" exit /b 1
                    if not exist "backend\\Dockerfile" exit /b 1
                    if not exist "frontend\\Dockerfile" exit /b 1

                    echo Required files found.
                '''
            }
        }

        stage('Production Deployment') {
            when {
                expression {
                    return env.DEPLOY_ENABLED == 'true'
                }
            }

            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'supermarket-prod-ssh',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    bat '''
                        @echo off
                        setlocal

                        echo Restricting temporary private-key permissions...

                        icacls "%SSH_KEY%" /inheritance:r
                        if errorlevel 1 exit /b 1

                        icacls "%SSH_KEY%" /grant:r "%USERDOMAIN%\\%USERNAME%:R"
                        if errorlevel 1 exit /b 1

                        echo Checking SSH client...
                        "C:\\Windows\\System32\\OpenSSH\\ssh.exe" -V
                        if errorlevel 1 exit /b 1

                        echo Connecting to the production server...

                        "C:\\Windows\\System32\\OpenSSH\\ssh.exe" ^
                          -i "%SSH_KEY%" ^
                          -o BatchMode=yes ^
                          -o IdentitiesOnly=yes ^
                          -o StrictHostKeyChecking=yes ^
                          -o UserKnownHostsFile="%KNOWN_HOSTS%" ^
                          -p %DEPLOY_PORT% ^
                          "%SSH_USER%@%DEPLOY_HOST%" ^
                          "sudo %DEPLOY_SCRIPT%"

                        if errorlevel 1 exit /b 1

                        echo Production deployment command completed.
                    '''
                }
            }
        }

        stage('Deployment Status') {
            steps {
                script {
                    if (env.DEPLOY_ENABLED == 'true') {
                        echo 'The production deployment command completed successfully.'
                    } else {
                        echo 'Validation only: production deployment remains disabled.'
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Review the console output before retrying.'
        }

        always {
            echo 'Pipeline execution finished.'
        }
    }
}
```
