# SwiftPayMe Monitoring Setup Guide

This guide provides detailed instructions for setting up a comprehensive monitoring and alerting system for the SwiftPayMe platform using Prometheus and Grafana.

## 1. Overview

The monitoring setup includes:

- **Prometheus**: A time-series database for collecting and storing metrics.
- **Grafana**: A visualization tool for creating dashboards and graphs.
- **Node Exporter**: An exporter for collecting server-level metrics.
- **cAdvisor**: An exporter for collecting container-level metrics.
- **Alertmanager**: A tool for handling and routing alerts.

## 2. Architecture

The monitoring architecture is as follows:

- **Prometheus** scrapes metrics from:
  - Node Exporter (server metrics)
  - cAdvisor (container metrics)
  - API Gateway (application metrics)
- **Grafana** queries Prometheus to display dashboards.
- **Alertmanager** receives alerts from Prometheus and sends notifications.

## 3. Docker Compose Configuration

We will use Docker Compose to set up the monitoring stack. Create a `docker-compose.monitoring.yml` file with the following content:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.37.0
    container_name: swiftpayme-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - swiftpayme-network

  grafana:
    image: grafana/grafana:8.5.2
    container_name: swiftpayme-grafana
    restart: unless-stopped
    ports:
      - "3003:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - swiftpayme-network

  node-exporter:
    image: prom/node-exporter:v1.3.1
    container_name: swiftpayme-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command: 
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - swiftpayme-network

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.44.0
    container_name: swiftpayme-cadvisor
    restart: unless-stopped
    ports:
      - "8081:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - swiftpayme-network

  alertmanager:
    image: prom/alertmanager:v0.24.0
    container_name: swiftpayme-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    networks:
      - swiftpayme-network

networks:
  swiftpayme-network:
    external: true

volumes:
  prometheus-data:
  grafana-data:
```

## 4. Prometheus Configuration

Create a `prometheus.yml` file with the following content:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:9090']
```

## 5. Alertmanager Configuration

Create an `alertmanager.yml` file with the following content:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['job']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'email'

receivers:
  - name: 'email'
    email_configs:
      - to: 'your-email@example.com'
        from: 'alertmanager@swiftpayme.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_identity: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

## 6. Deployment

1.  **Create the monitoring directory:**

    ```bash
    mkdir -p /home/ubuntu/swiftpayme/monitoring
    cd /home/ubuntu/swiftpayme/monitoring
    ```

2.  **Create the configuration files** (`docker-compose.monitoring.yml`, `prometheus.yml`, `alertmanager.yml`) in the `monitoring` directory.

3.  **Start the monitoring stack:**

    ```bash
    docker-compose -f docker-compose.monitoring.yml up -d
    ```

## 7. Accessing the Monitoring Tools

-   **Prometheus**: `http://[Your Server IP]:9090`
-   **Grafana**: `http://[Your Server IP]:3003` (default login: `admin`/`admin`)
-   **Alertmanager**: `http://[Your Server IP]:9093`

## 8. Creating Grafana Dashboards

1.  Log in to Grafana.
2.  Add Prometheus as a data source.
3.  Import pre-built dashboards or create your own.

    -   **Node Exporter Full**: Dashboard ID `1860`
    -   **Docker and System Monitoring**: Dashboard ID `893`

## 9. Setting Up Alerts

1.  Create alerting rules in Prometheus.
2.  Configure notification channels in Alertmanager.
3.  Verify that you receive alerts when the conditions are met.

This monitoring setup provides a solid foundation for observing the health and performance of your SwiftPayMe platform. You can customize the dashboards and alerting rules to meet your specific needs.
