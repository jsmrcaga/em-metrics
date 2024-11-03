variable github {
	type = object({
		token = string
	})
}

variable kube_config_path {
	type = string
	sensitive = true
}
