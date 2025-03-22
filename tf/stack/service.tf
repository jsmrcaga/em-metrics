resource kubernetes_service_v1 service {
  metadata {
    name = local.name
    namespace = local.namespace
  }

  spec {
    type = "LoadBalancer"

    selector = {
      app = local.name
    }

    port {
      protocol = "TCP"
      target_port = "app-port"
      port = var.service.port
    }
  }
}
