module repo {
  source = "git@github.com:jsmrcaga/terraform-modules//github-repo?ref=v0.2.3"

  github = {
    token = var.github.token
  }

  name = "em-metrics"
  visibility = "public"
  topics = []

  actions = {
    secrets = {
      KUBE_CLUSTER_B64 = base64encode(file(var.kube_config_path))
      EM_METRICS_TOKEN = var.em_api_token
    }
  }
}
