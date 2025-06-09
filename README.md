# Music League Visualizer

To efficiently organize and beautifully display exported data from the Music League app.

## Local Development

This project uses Docker for local development to ensure a consistent environment.

### Prerequisites

*   [Docker](https://www.docker.com/get-started) installed on your machine.

### Running the Application

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Start the application using Docker Compose:**
    ```bash
    docker-compose up
    ```
    This command will build the Docker image if it doesn't exist and then start the container.

3.  **View the application:**
    Open your web browser and navigate to [http://localhost:3000](http://localhost:3000).

The application supports hot-reloading, so changes made to files in the `src` directory will automatically update in the browser.

### Stopping the Application

To stop the application, press `Ctrl+C` in the terminal where `docker-compose up` is running, and then run:
```bash
docker-compose down
```
This will stop and remove the containers defined in your `docker-compose.yml` file.
