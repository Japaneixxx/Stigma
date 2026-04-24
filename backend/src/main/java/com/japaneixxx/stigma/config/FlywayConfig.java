package com.japaneixxx.stigma.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    @Value("${spring.flyway.url:${spring.datasource.url}}")
    private String url;

    @Value("${spring.flyway.user:${spring.datasource.username}}")
    private String user;

    @Value("${spring.flyway.password:${spring.datasource.password}}")
    private String password;

    @Bean(initMethod = "migrate")
    public Flyway flyway() {
        return Flyway.configure()
                .dataSource(url, user, password)
                .locations("classpath:db/migration")
                .baselineOnMigrate(false)
                .validateOnMigrate(true)
                .load();
    }
}