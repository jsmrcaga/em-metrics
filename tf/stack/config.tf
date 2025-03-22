resource kubernetes_config_map_v1 config {
  metadata {
    namespace = local.namespace
    name = "em-metrics-config"
  }

  data = {
    config = var.config != null ? jsonencode(var.config) : ""
  }
}
