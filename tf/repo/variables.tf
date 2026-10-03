variable github {
	type = object({
		token = string
	})
}

variable em_api_token {
	type = string
}

variable kube {
	type = object({
		config_path = string
		ca_data = string
		server_address = string
		namespace_prod = string
		namespace_staging = string
	})
}
