require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
Pod::Spec.new do |s|
  s.name = 'SearchSDKReactNative'
  s.version = package['version']
  s.summary = package['description']
  s.homepage = 'https://searchsdk.dev'
  s.license = { :type => 'MIT', :file => 'LICENSE' }
  s.author = 'Belweave'
  s.source = { :git => 'https://github.com/Belweave/searchSDK.git', :tag => "react-native-v#{s.version}" }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.source_files = 'ios/*.{swift,h,m}'
  s.dependency 'React-Core'
end
