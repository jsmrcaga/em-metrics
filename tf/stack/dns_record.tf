resource cloudflare_record subdomain {
	zone_id = var.subdomain.zone_id
  name = var.subdomain.name
  value = "home.jocolina.com"
  type = "CNAME"
}
