locals {
  name = "em-metrics"
  namespace = kubernetes_namespace_v1.em_metrics.metadata[0].name
}
