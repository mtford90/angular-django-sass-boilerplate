import logging

from django.contrib.auth import authenticate, login, logout
from django_filters import FilterSet
from rest_framework import viewsets
from rest_framework.response import Response

from server.filters import CustomDateTimeFilter
from server.models import CustomUser, Feedback, Vote, Comment, FeedbackAttachment
from server.serializers import UserSerialiser, FeedbackSerialiser, VoteSerialiser, CommentSerialiser, FeedbackAttachmentSerialiser


Logger = logging.getLogger('api')


class VoteViewSet(viewsets.ModelViewSet):
    queryset = Vote.objects.order_by('-created_at').all()
    serializer_class = VoteSerialiser
    filter_fields = ('up', 'user', 'feedback')


class CommentFilter(FilterSet):
    dt = CustomDateTimeFilter(name='created_at', lookup_type='lte')

    class Meta:
        model = Comment
        fields = ('user', 'feedback', 'dt')


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.order_by('-created_at')
    serializer_class = CommentSerialiser
    filter_class = CommentFilter
    ordering_fields = ('created_at', )

    def pre_save(self, obj):
        if self.request.user.is_authenticated():
            obj.user = self.request.user
        super().pre_save(obj)


class FeedbackAttachmentViewSet(viewsets.ModelViewSet):
    queryset = FeedbackAttachment.objects.all()
    serializer_class = FeedbackAttachmentSerialiser


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.filter(bug=False).extra(select={
        'num_votes': 'SELECT a-b FROM ((SELECT COUNT(*) AS a '
                     'FROM server_vote WHERE server_vote.feedback_id = server_feedback.id AND server_vote.up) '
                     'INNER JOIN (SELECT COUNT(*) AS b FROM server_vote WHERE server_vote.feedback_id = server_feedback.id AND NOT server_vote.up) )',
        'num_comments': 'SELECT COUNT(*) FROM server_comment WHERE server_comment.feedback_id = server_feedback.id'
    })
    serializer_class = FeedbackSerialiser

    filter_fields = ('user', )

    ordering_fields = ('created_at', 'num_votes', 'num_comments')

    def pre_save(self, obj):
        if self.request.user.is_authenticated():
            obj.user = self.request.user
        super().pre_save(obj)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerialiser

    def login(self, request):
        data = request.DATA
        if Logger.isEnabledFor(logging.DEBUG):
            Logger.debug('Logging in with: %s' % data)
        user = authenticate(**data)
        if not user:
            return Response(data={'detail': 'Invalid credentials'}, status=403)
        else:
            login(request, user)
            session = self._create_session(request, user)
            return Response(data=session)

    def _create_session(self, request, user):
        session_key = request.session.session_key
        expire_age = request.session.get_expiry_age()
        expire_date = request.session.get_expiry_date()
        session_d = {
            'sessionKey': session_key,
            'expiryAge': expire_age,
            'expireDate': expire_date,
            'user': UserSerialiser(instance=user).data
        }
        return session_d

    def sign_up(self, request):
        data = request.DATA
        if Logger.isEnabledFor(logging.DEBUG):
            Logger.debug('Signing up with details %s' % data)
        if data.get('username', None) and data.get('password', None) and data.get('email', None):
            if Logger.isEnabledFor(logging.DEBUG):
                Logger.debug('User signing up with credentials: %s' % data)
            user = CustomUser.objects.create_user(**data)
            return Response(data=UserSerialiser(instance=user).data)
        else:
            return Response(data={'detail': 'Must pass username, password and email'}, status=400)

    def verify(self, request):
        if request.user.is_authenticated():
            return Response(data={'user': UserSerialiser(instance=request.user).data, 'sessionKey': request.session.session_key})
        else:
            return Response(status=401)

    def logout(self, request):
        logout(request)
        return Response({'detail': 'success'})


