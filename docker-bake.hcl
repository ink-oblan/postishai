variable "IMAGE_BASE" {
  default = "ghcr.io/placeholder"
}

variable "IMAGE_TAG" {
  default = "latest"
}

variable "GIT_SHA" {
  default = "local"
}

group "default" {
  targets = ["app", "migrate", "worker"]
}

target "common" {
  context    = "."
  dockerfile = "Dockerfile"
  cache-from = ["type=gha,scope=images"]
  cache-to   = ["type=gha,mode=max,scope=images"]
  output     = ["type=registry"]
}

target "app" {
  inherits = ["common"]
  target   = "prod"
  tags = [
    "${IMAGE_BASE}/app:latest",
    "${IMAGE_BASE}/app:${IMAGE_TAG}",
    "${IMAGE_BASE}/app:sha-${GIT_SHA}",
  ]
}

target "migrate" {
  inherits = ["common"]
  target   = "migrate"
  tags = [
    "${IMAGE_BASE}/migrate:latest",
    "${IMAGE_BASE}/migrate:${IMAGE_TAG}",
    "${IMAGE_BASE}/migrate:sha-${GIT_SHA}",
  ]
}

target "worker" {
  inherits = ["common"]
  target   = "prod-build"
  tags = [
    "${IMAGE_BASE}/worker:latest",
    "${IMAGE_BASE}/worker:${IMAGE_TAG}",
    "${IMAGE_BASE}/worker:sha-${GIT_SHA}",
  ]
}
