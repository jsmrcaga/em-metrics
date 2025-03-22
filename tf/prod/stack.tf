resource random_password api_token {
  length = 32
}

module production {
  source = "../stack"

  environment = "production"
  otel_collector_url = "http://alloy.alloy.svc.cluster.local:4318/v1/metrics"

  replicas = 1

  app = {
    port = 3000
  }

  service = {
    port = 3002
  }

  ingress = {
    host = "em.jocolina.com"
  }

  subdomain = {
    name = "em.jocolina.com"
    zone_id = var.subdomain.zone_id
  }

  env = {
    DEV_ROUTES = true
    HOST = "0.0.0.0"
    PORT = 3000
    SENTRY_DSN = var.sentry.dsn
    APP_ENV = "production"
  }

  api_token = random_password.api_token.result

  docker = {
    username = var.docker.username
    password = var.docker.password
    registry = "ghcr.io"
  }

  resources = {
    requests = {
      cpu = "200m"
      memory = "250Mi"
    }

    limits = {
      cpu = "500m"
      memory = "250Mi"
    }
  }

  secrets = {
    linear_secret = var.linear_secret
  }

  config = var.config
}

output api_token {
  value = random_password.api_token
  sensitive = true
}
