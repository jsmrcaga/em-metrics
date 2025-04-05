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

    update_strategy {
      type = "RollingUpdate"
    }

    template {
      metadata {
        name = "${local.name}-${var.environment}"
        namespace = local.namespace

        labels = merge(
          {
            app = local.name
          },
          coalesce(var.pod_labels, {})
        )
      }

      spec {
        volume {
          name = "config-volume"
          config_map {
            optional = true
            name = kubernetes_config_map_v1.config.metadata[0].name
            items {
              key = "config"
              mode = "0444"
              path = "config.json"
            }
          }
        }

        volume {
          name = "em-metrics-data"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim_v1.claim.metadata[0].name
          }
        }

        container {
          name = local.name
          image = "hello-world"

          args = ["node", "src/index"]

          startup_probe {
            # for some reason node is taking 12 seconds to boot
            initial_delay_seconds = 15
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
            name = "em-metrics-data"
            mount_path = "/var/em-metrics/data"
          }

          volume_mount {
            name = "config-volume"
            # config.json is handled by the config-map definition
            mount_path = "/var/em-metrics-config"
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

          port {
            container_port = var.app.port
            name = "app-port"
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

          env {
            name = "LINEAR_SECRET"
            value_from {
              secret_key_ref {
                key = "LINEAR_SECRET"
                name = kubernetes_secret_v1.linear_secret.metadata[0].name
                optional = false
              }
            }
          }

          env {
            name = "CONFIG"
            value = var.config == null ? "" : "/var/em-metrics-config/config.json"
          }

          # Create env vars from master secret object
          dynamic env {
            for_each = var.env_secrets
            iterator = env_secret

            content {
              name = env_secret.key

              value_from {
                secret_key_ref {
                  key = env_secret.key
                  name = kubernetes_secret_v1.env_secrets.metadata[0].name
                  optional = false
                }
              }
            }
          }
        }

        image_pull_secrets {
          name = kubernetes_secret_v1.docker_registry.metadata[0].name
        }
      }
    }
  }
}
