# Stage 1: Build the application using official Maven image (with JDK 17 & Maven 3.9.6 pre-installed)
FROM maven:3.9.6-eclipse-temurin-17-jammy AS builder
WORKDIR /app

# 1. Copy pom.xml and cache dependencies (cached layer)
COPY pom.xml pom.xml
RUN MAVEN_OPTS="-Xmx384m -XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
    mvn dependency:go-offline --no-transfer-progress -q

# 2. Copy source and build package (skip tests to save memory/time)
COPY src src
RUN MAVEN_OPTS="-Xmx384m -XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
    mvn package -DskipTests --no-transfer-progress -q

# Stage 2: Create a minimal JRE 17 runtime image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENV PORT=8080
# Cap JVM memory to fit within Render free tier (512MB RAM)
ENTRYPOINT ["java", "-Xmx384m", "-Xms128m", "-jar", "app.jar"]
