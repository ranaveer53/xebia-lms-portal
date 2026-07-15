FROM eclipse-temurin:17-jdk AS builder
WORKDIR /app
COPY mvnw mvnw
COPY .mvn .mvn
COPY pom.xml pom.xml
COPY src src
RUN apt-get update && apt-get install -y curl unzip && sed -i 's/\r$//' mvnw && chmod +x mvnw && (chmod -R +x .mvn || true) && ./mvnw -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["java", "-jar", "app.jar"]
