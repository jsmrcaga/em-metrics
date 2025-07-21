variable github {
	type = object({
		token = string
	})
}

variable kube_config_path {
	type = string
	sensitive = true
}

variable em_api_token {
	type = string
}
