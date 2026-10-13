
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Repository checkout completed.'
            }
        }

        stage('Validate Pipeline') {
            steps {
                bat '''
                    @echo off
                    echo Checking required project files...

                    if not exist "compose.production.yml" exit /b 1
                    if not exist "backend\\Dockerfile" exit /b 1
                    if not exist "frontend\\Dockerfile" exit /b 1

                    echo Required files found.
                '''
            }
        }

        stage('Deployment Status') {
            steps {
                echo 'Validation only: production deployment is disabled.'
            }
        }
    }
}
