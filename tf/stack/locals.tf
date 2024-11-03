locals {
  name = "em-metrics"
  volume_name = "em-metrics-db-${var.environment}"
  namespace = kubernetes_namespace_v1.em_metrics.metadata[0].name
}
