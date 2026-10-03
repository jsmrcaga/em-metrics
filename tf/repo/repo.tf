module kubeconfig_prod {
  source = "git@github.com:jsmrcaga/terraform-modules//kubernetes/kubeconfig?ref=v0.3.1"

  cluster_name = "homelab"
  ca_data = var.kube.ca_data
  k8s_server_address = var.kube.server_address
  namespace = var.kube.namespace_prod

  providers = {
    kubernetes = kubernetes
  }
}

module kubeconfig_staging {
  source = "git@github.com:jsmrcaga/terraform-modules//kubernetes/kubeconfig?ref=v0.3.1"

  cluster_name = "homelab"
  ca_data = var.kube.ca_data
  k8s_server_address = var.kube.server_address
  namespace = var.kube.namespace_staging

  providers = {
    kubernetes = kubernetes
  }
}

module repo {
  source = "git@github.com:jsmrcaga/terraform-modules//github-repo?ref=v0.3.1"

  github = {
    token = var.github.token
  }

  name = "em-metrics"
  visibility = "public"
  topics = []

  actions = {
    secrets = {
      KUBE_CLUSTER_B64_PROD = base64encode(module.kubeconfig_prod.kubeconfig)
      KUBE_CLUSTER_B64_STAGING = base64encode(module.kubeconfig_staging.kubeconfig)
      EM_METRICS_TOKEN = var.em_api_token
    }
  }
}
