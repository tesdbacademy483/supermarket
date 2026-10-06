from rest_framework.permissions import SAFE_METHODS, BasePermission

MANAGERS = ("OWNER", "MANAGER")


def is_manager(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.role in MANAGERS))


class IsOwnerOrManager(BasePermission):
    """Purchases, expenses, reports, suppliers."""
    def has_permission(self, request, view):
        return is_manager(request.user)


class ReadOnlyOrManager(BasePermission):
    """Cashiers can look up products/categories/racks, only managers can change them."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return is_manager(request.user)


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or u.role == "OWNER"))
