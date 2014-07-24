"""
https://gist.github.com/copitux/5773821
"""
import datetime
from django import forms
from django.utils.encoding import force_str
from django_filters import Filter
from rest_framework.compat import parse_datetime

# '%Y-%m-%dT%H:%M:%S.%fZ'
class CustomDateTimeField(forms.DateTimeField):
    def strptime(self, value, _):
        value = force_str(value)
        parsed = parse_datetime(value)
        if parsed is None:  # Continue with other formats if doesn't match
            try:
                parsed = datetime.datetime.fromtimestamp(float(value)/1000.0)
            except (TypeError, ValueError):
                raise ValueError
        return parsed


class CustomDateTimeFilter(Filter):
    field_class = CustomDateTimeField
