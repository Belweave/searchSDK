plugins {
    id("com.android.library") version "8.13.2"
    id("org.jetbrains.kotlin.android") version "2.4.20"
}
android {
    namespace = "dev.searchsdk.consumer"
    compileSdk = 36
    buildToolsVersion = "36.0.0"
    defaultConfig {
        minSdk = 26
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_1_8; targetCompatibility = JavaVersion.VERSION_1_8 }
    sourceSets.getByName("test").resources.srcDir("../../../sdk-contract/fixtures")
    sourceSets.getByName("androidTest").assets.srcDir("../../../sdk-contract/fixtures")
    sourceSets.getByName("androidTest").res.srcDir(".local/device-res")
    testOptions { unitTests.all { it.maxHeapSize = "384m"; it.maxParallelForks = 1 } }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_1_8) } }
dependencies {
    implementation("dev.searchsdk:searchsdk-android:0.1.0-alpha.1")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("junit:junit:4.13.2")
}
