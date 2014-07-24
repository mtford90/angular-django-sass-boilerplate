from rest_framework.reverse import reverse
from rest_framework.status import is_success
from rest_framework.test import APITransactionTestCase

from api.models import CustomUser


class TestSignUp(APITransactionTestCase):
    def setUp(self):
        path = reverse('sign-up')
        self.response = self.client.post(path, data={
            'username': 'mtford',
            'password': 'xyz',
            'email': 'blah@blah.com'
        }, format='json')
        self.assertTrue(is_success(self.response.status_code))
        self.assertTrue(hasattr(self.response, 'data'))
        print(self.response.data)

    def test_should_be_missing(self):
        self.assertNotIn('password', self.response.data)
        self.assertNotIn('groups', self.response.data)
        self.assertNotIn('user_permissions', self.response.data)

    def test_present(self):
        self.assertIn('username', self.response.data)
        self.assertIn('id', self.response.data)
        self.assertIn('created_at', self.response.data)
        self.assertIn('updated_at', self.response.data)


class TestVerify(APITransactionTestCase):
    def setUp(self):
        CustomUser.objects.create_user(username='mtford',
                                       password='xyz')
        path = reverse('login')
        self.response = self.client.post(path, data={
            'username': 'mtford',
            'password': 'xyz'
        }, format='json')
        self.assertTrue(is_success(self.response.status_code))
        self.assertTrue(hasattr(self.response, 'data'))
        self.session_key = self.response.data['session_key']


class TestLogin(APITransactionTestCase):
    def setUp(self):
        CustomUser.objects.create_user(username='mtford',
                                       password='xyz')
        path = reverse('login')
        self.response = self.client.post(path, data={
            'username': 'mtford',
            'password': 'xyz'
        }, format='json')
        self.assertTrue(is_success(self.response.status_code))
        self.assertTrue(hasattr(self.response, 'data'))
        print(self.response.data)

    def test_present(self):
        self.assertIn('session_key', self.response.data)
        self.assertIn('expiry_age', self.response.data)
        self.assertIn('expire_date', self.response.data)