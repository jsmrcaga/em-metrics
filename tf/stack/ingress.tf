resource kubernetes_ingress_v1 ingress {
  metadata {
    name = local.name
    namespace = local.namespace
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
