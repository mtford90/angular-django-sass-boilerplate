from django.contrib import admin

# Register your models here.
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm
from server.models import CustomUser


class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = CustomUser


class CustomUserAdmin(UserAdmin):
    form = CustomUserChangeForm
    list_display = ('profile_photo_thumb', 'username', 'email', 'first_name', 'last_name', 'is_staff')

    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('profile_photo', 'about_me')}),
    )

    def profile_photo_thumb(self, obj):
        if obj.profile_photo:
            return u'<img src="%s" width="60"/>' % obj.profile_photo.url
        else:
            return None

    profile_photo_thumb.short_description = 'Profile Photo'
    profile_photo_thumb.allow_tags = True


admin.site.register(CustomUser, CustomUserAdmin)
