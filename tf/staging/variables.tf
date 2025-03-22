variable kubernetes_config {
  type = string
}

variable docker {
  type = object({
    username = string
    password = string
  })
}

variable cloudflare {
  type = object({
    email = string
    api_token = string
  })
}

variable subdomain {
  type = object({
    zone_id = string
  })
}

variable sentry {
  type = object({
    dsn = string
  })
}

variable linear_secret {
  type = string
  sensitive = true
}
