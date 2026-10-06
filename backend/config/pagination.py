from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"   # React can ask ?page_size=500 for dropdowns
    max_page_size = 1000
