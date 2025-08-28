variable environment {
  type = string

  validation {
    condition = contains(["staging", "production"], var.environment)
    error_message = "Environment can only be one of staging or production"
  }
}

variable sqlite_filename {
  type = string
  default = "db.sqlite"
}

variable otel_collector_url {
  type = string
}

variable env {
  type = map(string)
}

variable replicas {
  type = number
  validation {
    condition = var.replicas > 0
    error_message = "Replicas must be > 0"
  }
}

variable resources {
  type = object({
    requests = optional(object({
      cpu = optional(string, "100m")
      memory = optional(string, "126Mi")
    }))

    limits = optional(object({
      cpu = optional(string, "100m")
      memory = optional(string, "126Mi")
    }))
  })

  default = {
    requests = {
      cpu = "100m"
      memory = "126Mi"
    }

    limits = {
      cpu = "100m"
      memory = "126Mi"
    }
  }
}

variable api_token {
  type = string
}

variable ingress {
  type = object({
    host = string
  })
}

variable service {
  type = object({
    port = number
  })
}

variable app {
  type = object({
    port = number
  })
}

variable docker {
  type = object({
    registry = optional(string, "https://index.docker.io/v1/")
    username = string
    password = string
  })
}

variable subdomain {
  type = object({
    zone_id = string
    name = string
  })
}

variable secrets {
  type = object({
    linear_secret = string
  })
  sensitive = true
}

variable env_secrets {
  type = map(string)
  default = {}
  sensitive = true
}

variable config {
  type = any
  default = null
}

variable pod_labels {
  type = map(string)
  default = {}
}
