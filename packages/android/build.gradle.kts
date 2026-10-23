plugins {
    id("com.android.library") version "8.13.2"
    id("org.jetbrains.kotlin.android") version "2.4.20"
    `maven-publish`
}
group = "dev.searchsdk"
version = "0.1.0-alpha.1"
android {
    namespace = "dev.searchsdk.android"
    compileSdk = 36
    buildToolsVersion = "36.0.0"
    sourceSets.getByName("test").resources.srcDir("../../sdk-contract/fixtures")
    sourceSets.getByName("main").resources.srcDir(layout.buildDirectory.dir("generated/license"))
    defaultConfig { minSdk = 26; consumerProguardFiles("consumer-rules.pro") }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_1_8; targetCompatibility = JavaVersion.VERSION_1_8 }
    publishing { singleVariant("release") { withSourcesJar() } }
    testOptions { unitTests.all { it.maxHeapSize = "384m"; it.maxParallelForks = 1 } }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_1_8) } }
dependencies {
    api("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.11.0")
    implementation("com.squareup.okhttp3:okhttp:5.4.0")
    testImplementation("junit:junit:4.13.2")
}
afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                from(components["release"])
                artifactId = "searchsdk-android"
                pom {
                    name.set("searchSDK Android")
                    description.set("Kotlin Android client for application-owned searchSDK protocol v1 gateways")
                    url.set("https://github.com/Belweave/searchSDK")
                    licenses { license { name.set("MIT License"); url.set("https://opensource.org/license/mit") } }
                    developers { developer { name.set("Belweave") } }
                    scm { url.set("https://github.com/Belweave/searchSDK"); connection.set("scm:git:https://github.com/Belweave/searchSDK.git") }
                }
            }
        }
        repositories { maven { name = "verification"; url = uri(layout.buildDirectory.dir("repository")) } }
    }
}
tasks.withType<org.gradle.api.tasks.bundling.AbstractArchiveTask>().configureEach {
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
}

val prepareLicense by tasks.registering(Copy::class) {
    from("LICENSE")
    into(layout.buildDirectory.dir("generated/license/META-INF"))
    rename { "searchsdk-LICENSE" }
}
tasks.named("preBuild") { dependsOn(prepareLicense) }
