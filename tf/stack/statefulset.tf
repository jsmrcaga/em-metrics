resource kubernetes_stateful_set_v1 em_metrics {
  lifecycle {
    ignore_changes = [
      spec[0].template[0].spec[0].container[0].image
    ]
  }

  // Best argument ever
  wait_for_rollout = false

  metadata {
    name = local.name
    namespace = local.namespace
  }

  spec {
    replicas = var.replicas
    service_name = kubernetes_service_v1.service.metadata[0].name

    selector {
      match_labels = {
        app = local.name
      }
    }

    volume_claim_template {
      metadata {
        name = local.volume_name
        namespace = local.namespace
      }

      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          limits = {
            storage = "100Mi"
          }

          requests = {
            storage = "100Mi"
          }
        }
      }
    }

    template {
      metadata {
        name = "${local.name}-${var.environment}"
        namespace = local.namespace

        labels = {
          app = local.name
        }
      }

      spec {
        container {
          name = local.name
          image = "hello-world"

          startup_probe {
            initial_delay_seconds = 5
            period_seconds = 3
            timeout_seconds = 1

            # Will essentially wait for 35 secs for UP status
            success_threshold = 1
            failure_threshold = 10

            http_get {
              path = "/health"
              scheme = "HTTP"
              port = coalesce(var.env["PORT"], 3000)
            }
          }

          liveness_probe {
            period_seconds = 5
            timeout_seconds = 3

            # kubernetes forces 1 for success for some reason
            success_threshold = 1
            failure_threshold = 3

            http_get {
              path = "/health"
              scheme = "HTTP"
              port = coalesce(var.env["PORT"], 3000)
            }
          }

          readiness_probe {
            initial_delay_seconds = 5
            period_seconds = 5
            timeout_seconds = 3

            success_threshold = 1
            # 3 failures in case server is busy
            failure_threshold = 3

            http_get {
              path = "/health"
              scheme = "HTTP"
              port = coalesce(var.env["PORT"], 3000)
            }
          }

          volume_mount {
            name = local.volume_name
            mount_path = "/var/em-metrics/data"
          }

          resources {
            requests = {
              cpu = var.resources.requests.cpu
              memory = var.resources.requests.memory
            }

            limits = {
              cpu = var.resources.limits.cpu
              memory = var.resources.limits.memory
            }
          }

          env {
            name = "EM_METRICS_TOKEN_AUTH"
            value = var.api_token
          }

          env {
            name = "SQLITE_DB"
            value = "/var/em-metrics/data/${var.sqlite_filename}"
          }

          env {
            name = "OTEL_COLLECTOR_URL"
            value = var.otel_collector_url
          }

          dynamic env {
            for_each = var.env
            iterator = env_var

            content {
              name = env_var.key
              value = env_var.value
            }
          }

          env {
            name = "DEPLOYMENT_ENVIRONMENT"
            value = var.environment
          }
        }

        image_pull_secrets {
          name = kubernetes_secret_v1.docker_registry.metadata[0].name
        }
      }
    }
  }
}
