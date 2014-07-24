from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import DateTimeField, ForeignKey, TextField, BooleanField, CharField, ImageField
from django.utils import timezone


class CommonFields(models.Model):
    """
    Common fields that are associated with any model.
    """
    created_at = DateTimeField(default=timezone.now, db_index=True)
    updated_at = DateTimeField(default=timezone.now, db_index=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super(CommonFields, self).save()

    class Meta:
        abstract = True


class CustomUser(AbstractUser, CommonFields):
    profile_photo = models.ImageField(upload_to='profile_photos',
                                      blank=True,
                                      null=True)
    about_me = models.TextField(default='', editable=True)

    @property
    def profile_photo_url(self):
        try:
            return self.profile_photo.url
        except ValueError:
            # No file
            return settings.STATIC_URL + 'server/anon.png'


class Feedback(CommonFields):
    user = ForeignKey('CustomUser', related_name='feedback')
    description = TextField(default='')
    title = CharField(max_length=300)
    bug = BooleanField(default=False)


class Vote(CommonFields):
    feedback = ForeignKey(Feedback, related_name='votes')
    up = BooleanField(default=True)
    user = ForeignKey(CustomUser, related_name='votes')

    class Meta:
        unique_together = ('feedback', 'user')


class Comment(CommonFields):
    message = TextField()
    user = ForeignKey(CustomUser, related_name='comments')
    feedback = ForeignKey(Feedback, related_name='comments')


class FeedbackAttachment(CommonFields):
    image = ImageField(upload_to='feedback_attachments')

    @property
    def image_url(self):
        try:
            return self.image.url
        except ValueError:
            return ''