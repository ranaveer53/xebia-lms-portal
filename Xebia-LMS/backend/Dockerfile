FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /app

# Install curl and unzip so custom mvnw wrapper script can download and extract Maven 3.9.6
RUN apt-get update && apt-get install -y curl unzip && rm -rf /var/lib/apt/lists/*

# 1. Copy Maven wrapper & config first (cached layer – only re-run if pom.xml changes)
COPY mvnw mvnw
COPY .mvn .mvn
COPY pom.xml pom.xml

# 2. Normalise line endings and download all dependencies in one layer
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && \
    MAVEN_OPTS="-Xmx384m -XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
    ./mvnw dependency:go-offline --no-transfer-progress -q

# 3. Copy source and build the fat JAR (skip tests to save memory/time)
COPY src src
RUN MAVEN_OPTS="-Xmx384m -XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
    ./mvnw package -DskipTests --no-transfer-progress -q

# --- Runtime image (much smaller than JDK) ---
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENV PORT=8080
# Limit JVM heap so the whole container stays under 512 MB
ENTRYPOINT ["java", "-Xmx384m", "-Xms128m", "-jar", "app.jar"]
