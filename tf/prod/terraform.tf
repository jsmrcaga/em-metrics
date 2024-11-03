terraform {
  required_providers {
    kubernetes = {
      source = "hashicorp/kubernetes"
      version = "2.33.0"
    }

    cloudflare = {
      source = "cloudflare/cloudflare"
      version = "~> 2.0"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubernetes_config
}

provider "cloudflare" {
  email = var.cloudflare.email
  api_token = var.cloudflare.api_token
}
