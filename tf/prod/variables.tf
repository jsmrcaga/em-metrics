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

variable config {
  type = any
}

variable github {
  type = object({
    client_id = string
    client_secret = string
    webhook_secret = string
    rsa_pem_b64 = string
  })

  sensitive = true
}
