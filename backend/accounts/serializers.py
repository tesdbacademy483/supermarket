from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "role", "phone", "is_active", "password"]

    def create(self, data):
        password = data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": "Password is required for a new user."})
        user = User(**data)
        user.set_password(password)
        user.save()
        return user

    def update(self, user, data):
        password = data.pop("password", None)
        for k, v in data.items():
            setattr(user, k, v)
        if password:
            user.set_password(password)
        user.save()
        return user
