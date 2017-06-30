package com.thinkbiganalytics.auth.file;

/*-
 * #%L
 * kylo-security-auth-memory
 * %%
 * Copyright (C) 2017 ThinkBig Analytics
 * %%
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * #L%
 */

import com.thinkbiganalytics.auth.jaas.LoginConfiguration;
import com.thinkbiganalytics.auth.jaas.LoginConfigurationBuilder;
import com.thinkbiganalytics.auth.jaas.config.JaasAuthConfig;

import org.jboss.security.auth.spi.MemoryUsersRolesLoginModule;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

import java.util.Properties;

import javax.annotation.Nonnull;
import javax.security.auth.login.AppConfigurationEntry.LoginModuleControlFlag;

/**
 * Configures a memory-based login module.
 */
@Configuration
@Order(Ordered.HIGHEST_PRECEDENCE)
@Profile("auth-memory")
public class MemoryAuthConfig {
    
    public static final int AUTH_MEMORY_ORDER = LoginConfiguration.HIGH_ORDER - 10;

    @Bean(name = "memoryLoginRoles")
    public Properties getRoles() {
        return new Properties();
    }

    @Bean(name = "memoryLoginUsers")
    public Properties getUsers() {
        return new Properties();
    }

    @Bean(name = "servicesMemoryLoginConfiguration")
    public LoginConfiguration servicesFileLoginConfiguration(@Nonnull final LoginConfigurationBuilder builder, 
                                                             @Qualifier("memoryLoginUsers") final Properties users,
                                                             @Qualifier("memoryLoginRoles") final Properties roles) {
        // @formatter:off
        return builder
                .order(AUTH_MEMORY_ORDER)
                .loginModule(JaasAuthConfig.JAAS_SERVICES)
                    .moduleClass(MemoryUsersRolesLoginModule.class)
                    .controlFlag(LoginModuleControlFlag.SUFFICIENT)
                    .option("users", users)
                    .option("roles", roles)
                    .add()
                .build();
        // @formatter:on
    }
}
