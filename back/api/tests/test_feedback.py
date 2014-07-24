from django.core.urlresolvers import reverse
from rest_framework.status import is_success
from rest_framework.test import APITransactionTestCase
from api.models import CustomUser


class TestFeedback(APITransactionTestCase):



    def test_get(self):
        response = self.client.get(reverse('feedback-list'))
        print(response.status_code)
        self.assertTrue(is_success(response.status_code))

    def test_create(self):
        user = CustomUser.objects.create_user(username='mike', email='blah@blah.com', password='adsfasf')
        response = self.client.post(reverse('feedback-list'), data={
            'description': 'blah',
            'title': 'blah',
            'user': user.pk
        }, format='json')
        print(response.status_code)
        self.assertTrue(is_success(response.status_code))