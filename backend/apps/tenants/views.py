from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Tenant

# Create your views here.


class ValidateTenantView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        slug = request.query_params.get("slug")
        if not slug:
            return Response({"valid": False}, status=400)
        exists = Tenant.objects.filter(slug=slug, is_active=True).exists()
        return Response({"valid": exists})


class TenantPublicInfoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response(
                {"success": False, "message": "No workspace found."}, status=404
            )
        return Response(
            {
                "name": tenant.name,
                "slug": tenant.slug,
                "logo_url": tenant.logo_url,
                "tagline": tenant.tagline,
                "accent_color": tenant.accent_color,
                "white_label_enabled": tenant.white_label_enabled,
            }
        )

class PWAManifestView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        force_groven = request.query_params.get("force_groven") == "true"
        
        manifest = {
            "name": "Groven",
            "short_name": "Groven",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#0F6E56",
            "icons": [
                {
                    "src": "/icons/icon-192x192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "/icons/icon-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                },
                {
                    "src": "/icons/maskable-icon-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "maskable"
                }
            ]
        }
        
        if tenant and not force_groven:
            manifest["name"] = tenant.name
            manifest["short_name"] = tenant.name
            manifest["theme_color"] = tenant.accent_color or "#0F6E56"
            
            if tenant.logo_url:
                manifest["icons"] = [
                    {
                        "src": tenant.logo_url,
                        "sizes": "192x192 512x512 any",
                        "type": "image/png",
                        "purpose": "any maskable"
                    }
                ]
                
        return Response(manifest)
