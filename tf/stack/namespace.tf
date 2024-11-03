resource kubernetes_namespace_v1 em_metrics {
  metadata {
    name = "em-metrics-${var.environment}"
  }
}
