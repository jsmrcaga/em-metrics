resource kubernetes_persistent_volume_claim_v1 claim {
  wait_until_bound = false

  metadata {
    name = "em-metrics-data-claim"
    namespace = local.namespace
  }

  spec {
    access_modes = ["ReadWriteMany"]
    resources {
      limits = {
        storage = "100Mi"
      }

      requests = {
        storage = "100Mi"
      }
    }

    storage_class_name = "longhorn"
  }
}
