self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/api/suppliers"
      },
      {
        "source": "/api/suppliers/:path*"
      },
      {
        "source": "/api/incidents"
      },
      {
        "source": "/api/incidents/:path*"
      },
      {
        "source": "/api/inventory/:path*"
      },
      {
        "source": "/api/auth/:path*"
      },
      {
        "source": "/api/users/:path*"
      },
      {
        "source": "/api/profiles/:path*"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()