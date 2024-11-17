// TODO: deactivate http endpoint once clients are migrated
resource kubernetes_ingress_v1 ingress {
  metadata {
    name = local.name
    namespace = local.namespace

    annotations = {
      "kubernetes.io/ingress.class" = "traefik"
      "traefik.ingress.kubernetes.io/router.entrypoints" = "web"
    }
  }

  spec {
    rule {
      host = var.ingress.host

      http {
        path {
          path = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service_v1.service.metadata[0].name
              port {
                number = var.service.port
              }
            }
          }
        }
      }
    }
  }
}

resource kubernetes_ingress_v1 ingress_tls {
  metadata {
    name = "${local.name}-tls"
    namespace = local.namespace

    annotations = {
      "kubernetes.io/ingress.class" = "traefik"
      "traefik.ingress.kubernetes.io/router.entrypoints" = "websecure"
      "traefik.ingress.kubernetes.io/router.tls" = "true"
      "traefik.ingress.kubernetes.io/router.tls.certresolver" = "letsencrypt"
      "traefik.ingress.kubernetes.io/router.tls.domains.0.main" = var.ingress.host
    }
  }

  spec {
    rule {
      host = var.ingress.host

      http {
        path {
          path = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service_v1.service.metadata[0].name
              port {
                number = var.service.port
              }
            }
          }
        }
      }
    }
  }
}
