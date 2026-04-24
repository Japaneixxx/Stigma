# ─────────────────────────────────────────────
#  Stage 1: build
# ─────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Ensure the Maven Wrapper is executable in Linux containers (the Git exec bit
# can be lost on some platforms / packaging workflows)
RUN chmod +x mvnw

RUN ./mvnw dependency:go-offline -B

COPY src/ src/
RUN ./mvnw package -DskipTests -B && cp target/*.jar app.jar

# ─────────────────────────────────────────────
#  Stage 2: runtime
# ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/app.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
