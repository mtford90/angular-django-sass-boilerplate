from rest_framework.reverse import reverse
from rest_framework.status import is_success
from rest_framework.test import APITransactionTestCase

from server.models import CustomUser, Feedback, Vote




class TestVotes(APITransactionTestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='mtford',
                                                   password='blah',
                                                   email='blah@blah.com')

    def test_query_for_upvotes(self):
        feedback = Feedback.objects.create(description='adasdasd',
                                           title='asdasd',
                                           user=self.user)
        vote = Vote.objects.create(up=False,
                                   feedback=feedback,
                                   user=self.user)
        response = self.client.get(reverse('vote-list'), data={
            'up': False
        })
        self.assertTrue(is_success(response.status_code))
        self.assertEqual(response.data['count'], 1)
        response = self.client.get(reverse('vote-list'), data={
            'up': True
        })
        self.assertTrue(is_success(response.status_code))
        self.assertEqual(response.data['count'], 0)