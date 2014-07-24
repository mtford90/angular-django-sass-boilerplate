from django.conf.urls import patterns, url, include
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from server import views

from server.views import UserViewSet


class AppRouter(DefaultRouter):
    """
    The default router extends the SimpleRouter, but also adds in a default
    API root view, and adds format suffix patterns to the URLs.
    """
    include_root_view = True
    include_format_suffixes = True
    root_view_name = 'api-root'

    def get_api_root_view(self):
        """
        Return a view to use as the API root.
        """
        api_root_dict = {}
        list_name = self.routes[0].name
        for prefix, viewset, basename in self.registry:
            api_root_dict[prefix] = list_name.format(basename=basename)

        class APIRoot(APIView):
            _ignore_model_permissions = True

            def get(self, request, format=None):
                ret = {}
                for key, url_name in api_root_dict.items():
                    ret[key] = reverse(url_name, request=request, format=format)
                # Add custom views to root here:
                # e.g. ret['youtube'] = reverse('youtube', request=request, format=format)
                return Response(ret)

        return APIRoot.as_view()


router = AppRouter()
router.register(r'feedback', views.FeedbackViewSet)
router.register(r'votes', views.VoteViewSet)
router.register(r'users', views.UserViewSet)
router.register(r'comments', views.CommentViewSet)
router.register(r'feedback_attachments', views.FeedbackAttachmentViewSet)

urlpatterns = patterns('server.views',
                       url(r'', include(router.urls)),
                       url(r'login/$', UserViewSet.as_view({'post': 'login'}), name='login'),
                       url(r'verify/$', UserViewSet.as_view({'get': 'verify'}), name='verify'),
                       url(r'logout/$', UserViewSet.as_view({'get': 'logout'}), name='logout'),
                       url(r'sign_up/$', UserViewSet.as_view({'post': 'sign_up'}), name='sign-up'),
)