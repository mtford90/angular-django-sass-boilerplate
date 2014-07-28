"""
Django settings for app project.

For more information on this file, see
https://docs.djangoproject.com/en/1.6/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.6/ref/settings/
"""

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

STAGE = os.environ.get('STAGE', 'dev').lower()

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.6/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'fj@vkaq!trgi(+6(w1+3#mrn@3rc!)-&0p-=e4+jknxarn8e=z'

# SECURITY WARNING: don't run with debug turned on in production!
if STAGE == 'prod':
    DEBUG = False
    TEMPLATE_DEBUG = False
else:
    DEBUG = True
    TEMPLATE_DEBUG = True
    DEBUG_PROPAGATE_EXCEPTIONS = True

ALLOWED_HOSTS = ['*']

# Application definition

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api',
    'rest_framework',
    'south'
)

STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'app.urls'

WSGI_APPLICATION = 'app.wsgi.application'

if STAGE == 'dev':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
        }
    }
elif STAGE == 'prod':  # Production
    DATABASE_NAME = None
    DATABASE_USER = None
    DATABASE_PASSWORD = None
    DATABASE_HOST = None
    if DATABASE_NAME is None or \
       DATABASE_USER is None or \
       DATABASE_PASSWORD is None or \
       DATABASE_HOST is None:
        raise RuntimeError('Database not configured')
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql_psycopg2',
            'NAME': DATABASE_NAME,
            'USER': DATABASE_USER,
            'PASSWORD': DATABASE_PASSWORD,
            'HOST': DATABASE_HOST
        }
    }
else:
    raise RuntimeError('Unknown stage %s' % STAGE)


# Internationalization
# https://docs.djangoproject.com/en/1.6/topics/i18n/

LANGUAGE_CODE = 'en-gb'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.6/howto/static-files/

if STAGE == 'prod':
    STATIC_URL = '/static/'
else:
    STATIC_URL = '/api/static/'

if STAGE == 'prod':
    STATIC_ROOT = None
    if not STATIC_ROOT:
        raise RuntimeError('STATIC_ROOT not configured')
else:
    STATIC_ROOT = '/tmp/static'

try:
    os.makedirs(STATIC_ROOT)
except OSError:
    pass

TEMPLATE_DIRS = (
    os.path.join(BASE_DIR, 'templates'),
)


if STAGE == 'prod':
    MEDIA_URL = '/api/media/'
else:
    MEDIA_URL = '/api/media/'

if STAGE == 'prod':
    MEDIA_ROOT = None
    if not MEDIA_ROOT:
        raise RuntimeError('MEDIA_ROOT not configured')
else:
    MEDIA_ROOT = '/Users/mtford/Playground/media/'

if not os.path.exists(MEDIA_ROOT):
    os.makedirs(MEDIA_ROOT)

REST_FRAMEWORK = {
    'PAGINATE_BY': 10,  # Default to 10
    'PAGINATE_BY_PARAM': 'page_size',  # Allow client to override, using `?page_size=xxx`.
    'MAX_PAGINATE_BY': 100,  # Maximum limit allowed when using `?page_size=xxx`.
    'DEFAULT_FILTER_BACKENDS': ('rest_framework.filters.DjangoFilterBackend', 'rest_framework.filters.OrderingFilter')
}

LOGGING = {
    'version': 1,
    'formatters': {
        'mike': {
            'format': '%(asctime)-15s %(levelname)-7s %(message)s [%(funcName)s (%(filename)s:%(lineno)s)]',
        }
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'mike'
        }
    },
    'loggers': {
        'default': {
            'handlers': ['console'],
            'level': 'DEBUG'
        }
    },
}

AUTH_USER_MODEL = 'api.CustomUser'