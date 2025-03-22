resource kubernetes_secret_v1 docker_registry {
  metadata {
    name = "docker-secret"
    namespace = local.namespace
  }

  type = "kubernetes.io/dockerconfigjson"
  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "${var.docker.registry}" = {
          username = var.docker.username
          password = var.docker.password
          auth = base64encode("${var.docker.username}:${var.docker.password}")
        }
      }
    })
  }
}

resource kubernetes_secret_v1 linear_secret {
  metadata {
    name = "linear-secret"
    namespace = local.namespace
  }

  type = "linear.com/webhook-secret"
  data = {
    "LINEAR_SECRET" = var.secrets.linear_secret
  }
}
