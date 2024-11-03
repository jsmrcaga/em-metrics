module repo {
  source = "git@github.com:jsmrcaga/terraform-modules//github-repo?ref=v0.2.3"

  github = {
    token = var.github.token
  }

  name = "em-metrics"
  visibility = "public"
  topics = []
}
