terraform {
  required_providers {
    github = {
      source = "integrations/github"
      version = "~> 5.0"
    }

    kubernetes = {
      source = "hashicorp/kubernetes"
      version = "2.31.0"
    }
  }
}

provider kubernetes {
  config_path = var.kube.config_path
}
