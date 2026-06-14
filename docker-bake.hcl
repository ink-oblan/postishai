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
  output     = ["type=registry"]
}

target "app" {
  inherits   = ["common"]
  target     = "prod"
  cache-from = ["type=gha,scope=app"]
  cache-to   = ["type=gha,mode=max,scope=app"]
  tags = [
    "${IMAGE_BASE}/app:latest",
    "${IMAGE_BASE}/app:${IMAGE_TAG}",
    "${IMAGE_BASE}/app:sha-${GIT_SHA}",
  ]
}

target "migrate" {
  inherits   = ["common"]
  target     = "migrate"
  cache-from = ["type=gha,scope=migrate"]
  cache-to   = ["type=gha,mode=max,scope=migrate"]
  tags = [
    "${IMAGE_BASE}/migrate:latest",
    "${IMAGE_BASE}/migrate:${IMAGE_TAG}",
    "${IMAGE_BASE}/migrate:sha-${GIT_SHA}",
  ]
}

target "worker" {
  inherits   = ["common"]
  target     = "worker"
  cache-from = ["type=gha,scope=worker"]
  cache-to   = ["type=gha,mode=max,scope=worker"]
  tags = [
    "${IMAGE_BASE}/worker:latest",
    "${IMAGE_BASE}/worker:${IMAGE_TAG}",
    "${IMAGE_BASE}/worker:sha-${GIT_SHA}",
  ]
}
