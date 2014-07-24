from rest_framework import serializers

from api.models import CustomUser, Feedback, Comment, Vote, FeedbackAttachment


class UserSerialiser(serializers.ModelSerializer):
    profile_photo_url = serializers.Field(source='profile_photo_url')

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'created_at', 'updated_at', 'name', 'profile_photo', 'profile_photo_url', 'email')


class CommentSerialiser(serializers.ModelSerializer):
    user = UserSerialiser(read_only=True, required=False)

    class Meta:
        model = Comment


class NumVotesField(serializers.Field):
    def to_native(self, votes):
        return votes.filter(up=True).count() - votes.filter(up=False).count()


class FeedbackSerialiser(serializers.ModelSerializer):
    num_comments = serializers.Field('num_comments')
    user = UserSerialiser(read_only=True)
    num_votes = serializers.Field('num_votes')

    class Meta:
        model = Feedback
        readonly = ('bug',)


class VoteSerialiser(serializers.ModelSerializer):
    class Meta:
        model = Vote


class FeedbackAttachmentSerialiser(serializers.ModelSerializer):
    image_url = serializers.Field(source='image_url')

    class Meta:
        model = FeedbackAttachment